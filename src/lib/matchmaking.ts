import Peer, { type DataConnection } from 'peerjs'
import type { NetMessage, RegulationId } from '../types/game'

export type ConnectionHandler = (msg: NetMessage) => void

const PREFIX = 'bab-v1'

export function randomRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export function peerIdForRoom(code: string): string {
  return `${PREFIX}-room-${code.toUpperCase()}`
}

export function peerIdForLobby(regulationId: RegulationId, slot: number): string {
  return `${PREFIX}-lobby-${regulationId}-${slot}`
}

export class MatchConnection {
  peer: Peer | null = null
  conn: DataConnection | null = null
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

  async host(roomCode: string): Promise<string> {
    await this.destroy()
    const id = peerIdForRoom(roomCode)
    this.peer = new Peer(id, { debug: 1 })
    await waitOpen(this.peer)
    this.onStatus('ルーム待機中…')
    this.peer.on('connection', (conn) => {
      this.bindConn(conn)
    })
    this.peer.on('error', (err) => {
      this.onStatus(`接続エラー: ${err.type}`)
    })
    return id
  }

  async join(roomCode: string): Promise<void> {
    await this.destroy()
    this.peer = new Peer({ debug: 1 })
    await waitOpen(this.peer)
    this.onStatus('ルームに接続中…')
    const conn = this.peer.connect(peerIdForRoom(roomCode), { reliable: true })
    this.bindConn(conn)
  }

  /** Random match: try join lobby slots, else host one. */
  async random(regulationId: RegulationId): Promise<'host' | 'guest'> {
    await this.destroy()
    this.peer = new Peer({ debug: 1 })
    await waitOpen(this.peer)

    for (let slot = 0; slot < 8; slot++) {
      const lobbyId = peerIdForLobby(regulationId, slot)
      const ok = await tryConnect(this.peer, lobbyId)
      if (ok) {
        this.bindConn(ok)
        this.onStatus('ランダムマッチ成立（ゲスト）')
        return 'guest'
      }
    }

    // Host a lobby slot
    await this.destroy()
    for (let slot = 0; slot < 8; slot++) {
      try {
        const lobbyId = peerIdForLobby(regulationId, slot)
        this.peer = new Peer(lobbyId, { debug: 1 })
        await waitOpen(this.peer)
        this.onStatus('ランダム待機中…')
        this.peer.on('connection', (conn) => this.bindConn(conn))
        this.peer.on('error', (err) => this.onStatus(`接続エラー: ${err.type}`))
        return 'host'
      } catch {
        await this.destroy()
      }
    }
    throw new Error('ロビーを確保できませんでした')
  }

  send(msg: NetMessage): void {
    if (this.conn?.open) this.conn.send(msg)
  }

  async destroy(): Promise<void> {
    this.conn?.close()
    this.conn = null
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
  }

  private bindConn(conn: DataConnection) {
    this.conn = conn
    conn.on('open', () => {
      this.onStatus('対戦相手と接続しました')
      this.onPeerConnected(conn.peer)
    })
    conn.on('data', (data) => {
      this.onMessage(data as NetMessage)
    })
    conn.on('close', () => this.onStatus('切断されました'))
    conn.on('error', () => this.onStatus('データチャネルエラー'))
  }
}

function waitOpen(peer: Peer): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error('Peer open timeout')), 12000)
    peer.on('open', () => {
      clearTimeout(t)
      resolve()
    })
    peer.on('error', (err) => {
      clearTimeout(t)
      reject(err)
    })
  })
}

function tryConnect(peer: Peer, remoteId: string): Promise<DataConnection | null> {
  return new Promise((resolve) => {
    const conn = peer.connect(remoteId, { reliable: true })
    const timer = window.setTimeout(() => {
      conn.close()
      resolve(null)
    }, 1800)
    conn.on('open', () => {
      clearTimeout(timer)
      resolve(conn)
    })
    conn.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
  })
}
