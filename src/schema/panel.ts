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

const getUserValidate = ajv.compile<GetUserType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","username"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "username": { "type": "string" },

  }
});

export interface GetUserType {
  token: string;
  username:string
}

const getTableValidate = ajv.compile<GetTableType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","id"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "id": { "type": "number" },

  }
});

export interface GetTableType {
  token: string;
  id:number;
}

const getManagerValidate = ajv.compile<GetManagerType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","deputyId"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "deputy":{"type":"string"}
  }
});

export interface GetManagerType {
  token: string;
  deputy:string;
}

const getEmpValidate = ajv.compile<GetEmpType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","deputy","manager"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "deputyID":{"type":"string"},
    "managerID":{"type":"string"},
  }
});

export interface GetEmpType {
  token: string;
  deputy:string;
  manager:string;
}

export enum searchActionType{
  userSearch,tableSearch
}
const searchValidate = ajv.compile<searchType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","action","name"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "action":{"type":"number","enum": Object.values(searchActionType)},
    "name":{"type":"string"}
  }
});

export interface searchType {
  token: string;
  action:number;
  name:string;
}

const changePermission = ajv.compile<changePermissionType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","action","permission","value"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "id":{"type":"number"},
    "value":{"type":"number"},
    "permission":{"type":"string"}
  }
});

export interface changePermissionType {
  token: string;
  id:number;
  permission:string;
  value:number
}

const changeReadPermission = ajv.compile<changeReadWritePermissionType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","userId","tableId","value"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "userId":{"type":"number"},
    "tableId":{"type":"number"},
    "value":{"type":"string"}
  }
});

export interface changeReadWritePermissionType {
  token: string;
  userId:number;
  tableId:number;
  value:string;
}


const changePassword = ajv.compile<changePasswordType>({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["token","oldPass","newPass"],
  "additionalProperties": false,
  "properties": {
    "token": { "type": "string" },
    "oldPass":{"type":"string"},
    "newPass":{"type":"string"},

  }
});

export interface changePasswordType {
  token: string;
  oldPass:string;
  newPass:string;

}

export const schema = {
  loginValidate,
  registerValidate,
  generateTableValidate,approveValidate,getValidate,searchValidate,changePermission
};
