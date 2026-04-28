import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!isUuid(value)) {
      throw new BadRequestException({
        message: `${metadata.data ?? 'value'} must be a valid UUID`,
        code: 'VALIDATION_ERROR',
      });
    }
    return value;
  }
}
