import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T> | any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T> | any> {
    return next.handle().pipe(
      map((res) => {
        // If response is already formatted with data property, pass through
        if (res && typeof res === 'object' && 'data' in res) {
          return res;
        }

        // If response is null/undefined or primitive/array/object, wrap in data
        return {
          data: res,
        };
      }),
    );
  }
}
