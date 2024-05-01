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

export const schema = {
  loginValidate
}