/** Values captured from a QR sign-on URL (e.g. `/1048/7/3/1/301`). */
export interface QrLandingContext {
  User_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Card_ID?: number | null;
}
