import { ajv } from "@/utils";

const setWriteAccessValidate = ajv.compile<SetWriteAccess>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "table", "users"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "table": { "type": "number" },
    "users": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        required: [],
        "properties": {
          "id": {
            "type": "number"
          }
        }
      }
    }
  }
});

export interface Vahed {
  id: number;
}

export interface Province {
  id: number;
}

export interface SetWriteAccess {
  table: string;
  token: string;
  users: Vahed[];
}

const getWriteAccessValidate = ajv.compile<getWriteAccess>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "tableId"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "tableId": { "type": "number" }
  }
});

export interface getWriteAccess {
  token: string;
  tableId: number;
}

const getTableBranchValidate = ajv.compile<GetTableBranchType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "offset", "branchId"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },

    "offset": { "type": "number" },
    "branchID": { "type": "number" }
  }
});

export interface GetTableBranchType {
  token: string;
  offset: number;
  branchId: number;
}
