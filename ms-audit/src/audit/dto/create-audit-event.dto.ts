import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAuditEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  servicio!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(CREATE|UPDATE|DELETE|LOGIN|LOGOUT|SELECT)$/, {
    message: 'accion debe ser CREATE|UPDATE|DELETE|LOGIN|LOGOUT|SELECT',
  })
  accion!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z-]+$/, { message: 'entidad: MAYÚSCULAS y guiones' })
  @MaxLength(40)
  entidad!: string;

  @IsObject()
  @IsOptional()
  datos?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  usuarioId?: string;

  @IsEmail()
  @IsOptional()
  usuarioEmail?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}