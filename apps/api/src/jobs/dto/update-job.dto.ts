import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { JobSkillInputDto } from './job-skill.dto.js';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Senior Backend Engineer', minLength: 3, maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 255)
  title?: string;

  @ApiPropertyOptional({
    example: 'We are looking for a Node.js / NestJS engineer...',
    minLength: 10,
    maxLength: 10000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(10, 10000)
  description?: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh City, Vietnam', maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'HYBRID', enum: ['ONSITE', 'HYBRID', 'REMOTE'] })
  @IsOptional()
  @IsIn(['ONSITE', 'HYBRID', 'REMOTE'])
  workMode?: string;

  @ApiPropertyOptional({ example: 'c0000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: [JobSkillInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobSkillInputDto)
  skills?: JobSkillInputDto[];
}
