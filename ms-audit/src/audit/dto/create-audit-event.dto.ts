import {
  IsEmail,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAuditEventDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(CREATE|UPDATE|DELETE|LOGIN|LOGOUT|SELECT)$/, {
    message: 'action debe ser CREATE|UPDATE|DELETE|LOGIN|LOGOUT|SELECT',
  })
  action!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z_-]+$/, { message: 'entity: solo MAYÚSCULAS, guiones o guiones bajos' })
  @MaxLength(40)
  entity!: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  userId?: string;

  @IsEmail()
  @IsOptional()
  userEmail?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
