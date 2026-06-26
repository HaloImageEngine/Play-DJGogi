/** POST body for `Bingo/CallList/Check_Called_Number`. */
export interface CheckCalledNumberRequest {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Song_ID: number;
}

/** Response from `Bingo/CallList/Check_Called_Number`. */
export interface CheckCalledNumberResult {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Song_ID: number;
  WasCalled: boolean;
}
