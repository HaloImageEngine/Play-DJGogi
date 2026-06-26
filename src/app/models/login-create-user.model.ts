/** POST body for `RapidCMS/login/create`. */
export interface LoginCreateUserRequest {
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  Email: string;
  UserAlias: string;
  Password: string;
  UserType: string;
  Zip: string;
  PhoneNum: string;
}

/** Fields collected on the create-account form (UserType set in LoginService). */
export type LoginCreateUserPayload = Omit<LoginCreateUserRequest, 'UserType'>;

/** Response from `RapidCMS/login/create`. */
export interface LoginCreateUserResult {
  ok: boolean;
  userId: number | null;
  userInfoId: number | null;
  error: string | null;
  /** API returns ok:true with userId/userInfoId 0 when UserAlias is already taken. */
  duplicateUserAlias?: boolean;
}
