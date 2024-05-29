import { ajv } from "@/utils";


const setWriteAccessValidate = ajv.compile<SetWriteAccess>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","table", "users"],
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
          },

        }
      }
    }
  }
});


export interface Vahed{
  id:number;
}
export interface SetWriteAccess {
  table: string;
  token:number;
  users:Vahed[];
}


const getWriteAccessValidate = ajv.compile<getWriteAccess>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","tableId"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "tableId": { "type": "number" },

  }
});


export interface getWriteAccess{
  token:string
  tableId:number;
}