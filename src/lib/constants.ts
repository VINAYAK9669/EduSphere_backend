export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const IS_PROD = NODE_ENV === 'production';
