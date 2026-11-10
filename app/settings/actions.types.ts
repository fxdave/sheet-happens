export type SecuritySettingsActionState = {
  status: "success" | "error";
  message: string;
};

export type MemberPreferenceActionState =
  | {
      status: "idle";
      message: "";
    }
  | {
      status: "success" | "error";
      message: string;
    };

export type NotificationSettingsActionState = MemberPreferenceActionState;

export type RenamePasskeyActionInput = {
  passkeyId: string;
  name: string;
};

export type DeletePasskeyActionInput = {
  passkeyId: string;
};

export type DisconnectConnectedAppActionInput = {
  /** The OAuth `client_id` of the connected app: a CIMD URL, or an opaque registered id. */
  clientId: string;
};

export type CreateApiTokenActionInput = {
  name: string;
  scopes: string[];
  /** One of `API_TOKEN_EXPIRY_OPTIONS`: days as a string, or `never`. */
  expiry: string;
};

export type CreateApiTokenActionState =
  | {
      status: "success";
      message: string;
      /** The plaintext, returned exactly once and never stored. */
      token: string;
    }
  | {
      status: "error";
      message: string;
    };

export type RevokeApiTokenActionInput = {
  tokenId: string;
};
