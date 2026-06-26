/** Dev: proxied via `proxy.conf.json` (`/gogi-api` → api.getgogi.com) to avoid CORS (API allows localhost:4200 only). */
const apiBaseUrl = '/gogi-api/api/';

export const environment = {
  production: false,
  debugLogging: true,
  version: '26.06.01.01.T',
  cardRefreshIntervalSeconds: 15,
  apiBaseUrl,
  rapidCmsVerifyAliasApiUrl: `${apiBaseUrl}RapidCMS/login/verify-alias`,
  rapidCmsCreateUserApiUrl: `${apiBaseUrl}RapidCMS/login/create`,
  bingoPrintedCardsApiBaseUrl: `${apiBaseUrl}Bingo/Bingo/Get_Printed_Cards`,
  bingoPrintedCardsByCardIdApiBaseUrl: `${apiBaseUrl}Bingo/Bingo/Get_Printed_Cards_byCardID`,
  bingoDropDownCallListByUserApiUrl: `${apiBaseUrl}Bingo/CallList/Get_DropDown_CallList_ByUserID`,
  bingoExistingCardsByUserApiUrl: `${apiBaseUrl}Bingo/CallList/Get_Existing_Cards_byUserID`,
  bingoExistingCardsByPidApiUrl: `${apiBaseUrl}Bingo/CallList/Get_Existing_Cards_ByPID`,
  bingoCheckCalledNumberApiUrl: `${apiBaseUrl}Bingo/CallList/Check_Called_Number`,
  bingoLatestGamesByUserApiUrl: `${apiBaseUrl}Bingo/Game/Get_Latest_Games_by_UserID`,
  bingoMaxGameIdApiUrl: `${apiBaseUrl}Bingo/CallList/Get_Max_Game_ID`
};
