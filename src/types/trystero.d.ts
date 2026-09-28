declare module 'trystero' {
  export const selfId: string

  export type RoomConfig = {
    appId: string
    password?: string
  }

  export type ActionSendOptions = {
    target?: string
    metadata?: unknown
  }

  export type MessageAction<T = unknown> = {
    send: (data: T, options?: ActionSendOptions) => Promise<unknown>
    onMessage: ((data: T, meta: { peerId: string }) => void) | null
  }

  export type Room = {
    makeAction: <T = unknown>(actionId: string) => MessageAction<T>
    leave: () => void | Promise<void>
    getPeers: () => Record<string, RTCPeerConnection>
    onPeerJoin: ((peerId: string) => void) | null
    onPeerLeave: ((peerId: string) => void) | null
  }

  export function joinRoom(config: RoomConfig, roomId: string): Room
}
