/** `GET …/Get_DropDown_CallList_ByUserID/{User_ID}` */
export interface BingoCallListDropdownByUser {
  Call_List_ID: number;
  Game_ID?: number | null;
  User_ID?: number | null;
}

export interface BingoExistingCardDetail {
  Card_ID: number;
  User_ID: number | null;
  Game_ID: number | null;
  Call_List_ID: number;
  Inning: number;
  Card_Date_Create: string | null;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  PlayCount: number;
  Card_IsWinner: boolean;
  Card_SeedKey: string | null;
  Card_PrintedAt: string | null;
  Call_List_Name: string | null;
  PIDT?: number | null;
}

/** `GET …/Get_Existing_Cards_ByPID/{PIDT}` — summary block. */
export interface BingoExistingCardsByPidSummary {
  PIDT: number;
  Game_ID: number | null;
  Call_List_ID: number | null;
  Total_Cards: number;
  Total_Innings: number;
  Total_Winners: number;
  Total_NonWinners: number;
  Win_Rate_Pct: number;
  Total_Printed: number;
  Print_Rate_Pct: number;
  Total_Named_Players: number;
  Total_PlayCount: number;
  Avg_PlayCount: number;
  Max_PlayCount: number;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
  Last_Printed: string | null;
}

/** Per-inning stats from `Get_Existing_Cards_ByPID`. */
export interface BingoInningBreakdown {
  Inning: number;
  Card_Count: number;
  Winner_Count: number;
  NonWinner_Count: number;
  Win_Rate_Pct: number;
  Printed_Count: number;
  Print_Rate_Pct: number;
  Named_Player_Count: number;
  Total_PlayCount: number;
  Avg_PlayCount: number;
  Max_PlayCount: number;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
}

/** `GET …/Get_Existing_Cards_ByPID/{PIDT}` */
export interface BingoExistingCardsByPid {
  Summary: BingoExistingCardsByPidSummary;
  InningBreakdown: BingoInningBreakdown[];
  InningList: number[];
  CardDetails: BingoExistingCardDetail[];
}

export interface BingoExistingCardsByUser {
  Summary: {
    User_ID: number;
    Total_Cards: number;
  };
  CardDetails: BingoExistingCardDetail[];
}

export interface BingoLatestGame {
  Game_ID: number;
  Game_Number: number;
  Game_Inning: number;
  Game_Name: string;
  Game_Status: string;
  Call_List_ID: number;
  Call_List_Name: string | null;
}

/** Saved player session: Game + Call List + Inning. */
export interface PlayerGameContext {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
}
