import type { NetMessage } from '../types/game'
import { MatchConnection } from './matchmaking'

/** Offline practice: a MatchConnection lookalike that never talks to PeerJS. */
export function createLocalMirrorConnection(): MatchConnection {
  const noop = () => undefined
  const conn = new MatchConnection(noop, noop, noop)
  const originalSend = conn.send.bind(conn)
  conn.send = (msg: NetMessage) => {
    // Host-only practice: ignore outbound except keep API compatible
    void originalSend
    void msg
  }
  return conn
}
