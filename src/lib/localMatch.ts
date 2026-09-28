import type { NetMessage } from '../types/game'
import { MatchConnection } from './matchmaking'

/** Offline practice: MatchConnection API without any P2P signaling. */
export function createLocalMirrorConnection(): MatchConnection {
  const noop = () => undefined
  const conn = new MatchConnection(noop, noop, noop)
  conn.send = (msg: NetMessage) => {
    void msg
  }
  return conn
}
