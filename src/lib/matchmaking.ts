import { joinRoom, selfId } from 'trystero'
import type { NetMessage, RegulationId } from '../types/game'

export type ConnectionHandler = (msg: NetMessage) => void

/** Unique app namespace so rooms never collide with other Trystero apps. */
const APP_ID = 'build-and-battle-v1'

type Room = ReturnType<typeof joinRoom>
type NetAction = ReturnType<Room['makeAction']>

export function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

function roomIdForCode(code: string): string {
  return `room-${code.toUpperCase()}`
}

function lobbyRoomId(regulationId: RegulationId): string {
  // 2-minute buckets so random seekers in the same window meet without a lobby server
  const bucket = Math.floor(Date.now() / 120_000)
  return `lobby-${regulationId}-${bucket}`
}

/**
 * Serverless P2P match connection.
 * Signaling uses public Nostr relays via Trystero; game traffic is direct WebRTC (E2E).
 * No app backend / PeerJS cloud required — works on GitHub Pages as static files.
 */
export class MatchConnection {
  private room: Room | null = null
  private net: NetAction | null = null
  private remotePeerId: string | null = null
  private paired = false
  private onMessage: ConnectionHandler
  private onStatus: (status: string) => void
  private onPeerConnected: (peerId: string) => void

  constructor(
    onMessage: ConnectionHandler,
    onStatus: (status: string) => void,
    onPeerConnected: (peerId: string) => void,
  ) {
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.onPeerConnected = onPeerConnected
  }

  setMessageHandler(handler: ConnectionHandler): void {
    this.onMessage = handler
  }

  getLocalPeerId(): string {
    return selfId
  }

  async host(roomCode: string): Promise<string> {
    await this.openRoom(roomIdForCode(roomCode), 'host')
    this.onStatus(`ルーム待機中…（コード ${roomCode.toUpperCase()}）`)
    return roomIdForCode(roomCode)
  }

  async join(roomCode: string): Promise<void> {
    await this.openRoom(roomIdForCode(roomCode), 'guest')
    this.onStatus('ルームに接続中…')
  }

  /**
   * Random match in a time-bucketed lobby room.
   * Lower selfId becomes host when the second peer arrives.
   */
  async random(regulationId: RegulationId): Promise<'host' | 'guest'> {
    const roomId = lobbyRoomId(regulationId)
    this.onStatus('ランダム待機中…（サーバーレスP2P）')
    await this.openRoom(roomId, 'auto')

    // If a peer is already present, pair immediately
    const peers = Object.keys(this.room?.getPeers() ?? {})
    if (peers.length > 0) {
      const peerId = peers[0]
      const role = selfId < peerId ? 'host' : 'guest'
      this.acceptPeer(peerId)
      return role
    }

    return await new Promise<'host' | 'guest'>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error('マッチングがタイムアウトしました。もう一度お試しください。'))
      }, 90_000)

      if (!this.room) {
        clearTimeout(timer)
        reject(new Error('ルームを開けませんでした'))
        return
      }

      const prev = this.room.onPeerJoin
      this.room.onPeerJoin = (peerId) => {
        prev?.(peerId)
        if (this.paired) return
        clearTimeout(timer)
        const role = selfId < peerId ? 'host' : 'guest'
        this.acceptPeer(peerId)
        this.onStatus(
          role === 'host' ? 'ランダムマッチ成立（ホスト）' : 'ランダムマッチ成立（ゲスト）',
        )
        resolve(role)
      }
    })
  }

  send(msg: NetMessage): void {
    if (!this.net) return
    if (this.remotePeerId) {
      void this.net.send(msg, { target: this.remotePeerId })
    } else {
      void this.net.send(msg)
    }
  }

  async destroy(): Promise<void> {
    this.paired = false
    this.remotePeerId = null
    this.net = null
    if (this.room) {
      try {
        await this.room.leave()
      } catch {
        // ignore leave errors during teardown
      }
      this.room = null
    }
  }

  private async openRoom(roomId: string, _mode: 'host' | 'guest' | 'auto'): Promise<void> {
    await this.destroy()
    this.room = joinRoom({ appId: APP_ID }, roomId)
    this.net = this.room.makeAction('bab-net')

    this.net.onMessage = (data, { peerId }) => {
      if (this.remotePeerId && peerId !== this.remotePeerId) return
      this.onMessage(data as NetMessage)
    }

    this.room.onPeerJoin = (peerId) => {
      if (this.paired) return
      // For host/join rooms: first joiner is the opponent
      if (_mode === 'host' || _mode === 'guest') {
        this.acceptPeer(peerId)
      }
    }

    this.room.onPeerLeave = (peerId) => {
      if (peerId === this.remotePeerId) {
        this.onStatus('切断されました')
      }
    }
  }

  private acceptPeer(peerId: string): void {
    if (this.paired) return
    this.paired = true
    this.remotePeerId = peerId
    this.onStatus('対戦相手と接続しました（P2P）')
    this.onPeerConnected(peerId)
  }
}
