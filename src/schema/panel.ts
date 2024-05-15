import { ajv } from "../utils";

const loginValidate = ajv.compile<loginType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["username", "password"],
  "additionalProperties": false,
  "properties": {
    "username": { "type": "string" },
    "password": { "type": "string" }
  }
});

export interface loginType {
  username: string;
  password: string;
}

//todo:complete this schema

const registerValidate = ajv.compile<registerType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "username", "password"],
  "additionalProperties": true,
  "properties": {
    "token": { "type": "string" },
    "username": { "type": "string" },
    "password": { "type": "string" }
  }
});

export interface registerType {
  token: string;
  username: string;
  password: string;
  deputyName: string;
  managementName: string;
  expertName: string;
}

export enum Types {
  anyThings,
  phoneNumber,
  homeNumber,
  nationalCode,
  comboBox,
  decimal,
  date,
}


export function comboRegexGenerator(values: string[]): string {
  let val: string = "";
  val += "^(?:";

  for (let i: number = 0; i < values.length; i++) {
    if (i + 1 != values.length) {
      val += `${values[i]}|`;
    } else {
      val += `${values[i]}`;
    }
  }
  val += ")$";
  return val;
}

const generateTableValidate = ajv.compile<newTable>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "password"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "tableName": { "type": "string" },
    "deadline": { "type": "string" },
    "fields": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        required: [],
        "properties": {
          "comboBoxValues": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "nullable": {
            "type": "boolean"
          },
          "name": {
            "type": "string"
          },
          "model": {
            "type": "integer",
            "enum": Object.values(Types)
          }
        }
      }
    }
  }
});

interface expertField {
  name: string;
  model: string;
  comboBoxValues: string[];
  nullable: boolean;
}

export interface fields extends expertField {
  regex: string;
}

export interface newTable {
  token: string;
  fields: fields[];
  deadline: string;
  tableName: string;
}




const approveValidate = ajv.compile<ApproveType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token", "tableID", "func"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "tableID": { "type": "string" },
    "func": { "type": "string" }
  }
});

export interface ApproveType {
  token: string;
  tableID: number;
  func: string;
}


export interface editTable {
  tableID:number;
  token: string;
  fields: fields[];
  deadline: string;
  tableName: string;
}
const editTableValidate = ajv.compile<editTable>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["tableName","token","fields","deadline","tableID"],
  "additionalProperties": false,
  "properties": {
    "tableID":{"type":"string"},
    "token": { "type": "string" },
    "tableName": { "type": "string" },
    "deadline": { "type": "string" },
    "fields": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        required: [],
        "properties": {
          "comboBoxValues": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "nullable": {
            "type": "boolean"
          },
          "name": {
            "type": "string"
          },
          "model": {
            "type": "integer",
            "enum": Object.values(Types)
          }
        }
      }
    }
  }
});

const getValidate = ajv.compile<GetType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },

  }
});

export interface GetType {
  token: string;
}


export const schema = {
  loginValidate,
  registerValidate,
  generateTableValidate,approveValidate,getValidate
};
