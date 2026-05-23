import { Response } from 'express';
import StatusCode from 'http-status-codes';

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

export const sendResponse = <T = any>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  errors?: any
): Response => {
  const response: APIResponse<T> = {
    success,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = StatusCode.OK
): Response => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (
  res: Response,
  message: string,
  errors?: any,
  statusCode: number = StatusCode.INTERNAL_SERVER_ERROR
): Response => {
  return sendResponse(res, statusCode, false, message, undefined, errors);
};
