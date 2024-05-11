import { ajv } from "../utils";



const loginValidate = ajv.compile<loginType>({
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'required': [
      'username',
      'password',
      
  ],
  'additionalProperties': false,
  'properties': {
      'username': {'type': 'string', },
      'password': {'type': 'string',},
      
  }
});

export interface loginType {
  username: string;
  password: string;
  
}


const registerValidate = ajv.compile<loginType>({
  '$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'required': [
    'username',
    'password',

  ],
  'additionalProperties': true,
  'properties': {
    'username': {'type': 'string', },
    'password': {'type': 'string',},
    'token': {'type': 'string'},
  }
});

export interface registerType {
  token:string
  username: string;
  password: string;
  deputyName:string;
  managementName:string;
  expertName:string;
}


export const schema = {
  loginValidate,registerValidate
}