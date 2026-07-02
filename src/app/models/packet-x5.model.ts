/** `POST …/Packet/Get_PacketID_Details_By_PIDTX5` request. */
export interface PacketIdDetailsByPidtx5Request {
  PIDTX5: number;
}

/** Master row from X5 packet responses. */
export interface PacketMasterX5 {
  PMX5_ID: number;
  PIDTX5: number;
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

/** Row from `PacketDetails` in X5 packet responses. */
export interface PacketDetailX5 {
  PIDTX5: number;
  PDX5_ID: number;
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

/** `POST …/Packet/Get_PacketID_Details_By_PIDTX5` */
export interface PacketIdDetailsByPidtx5Result {
  Master: PacketMasterX5 | null;
  PacketDetails: PacketDetailX5[];
}
