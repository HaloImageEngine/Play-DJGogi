/** `POST …/Packet/Get_PacketID_Details_By_PIDTX3` request. */
export interface PacketIdDetailsByPidtx3Request {
  PIDTX3: number;
}

/** Master row from X3 packet responses. */
export interface PacketMasterX3 {
  PMX3_ID: number;
  PIDTX3: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  User_ID: number;
  GPCode: string;
  GPDescription: string;
  Comment: string;
  Created: string;
  Updated: string | null;
  CardCount?: number;
}

/** Row from `PacketDetails` in X3 packet responses. */
export interface PacketDetailX3 {
  PIDTX3: number;
  PDX3_ID: number;
  Card_ID: number;
  Inning: number;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  Card_IsWinner: boolean;
  PlayCount: number;
  Card_PrintedAt: string | null;
  Status: string;
  Detail_Winner: boolean;
  Detail_Created: string;
  Detail_Updated: string | null;
}

/** `POST …/Packet/Get_PacketID_Details_By_PIDTX3` */
export interface PacketIdDetailsByPidtx3Result {
  Master: PacketMasterX3 | null;
  PacketDetails: PacketDetailX3[];
}
