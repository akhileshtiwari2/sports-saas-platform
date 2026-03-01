import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from 'types';

@Controller('lessons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITY_ADMIN, UserRole.COACH, UserRole.SUPER_ADMIN)
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get('tenant')
  async getByTenant(
    @CurrentUser() user: { tenantId?: string },
    @Query('facilityId') facilityId?: string
  ) {
    if (!user.tenantId) return [];
    return this.lessons.getByTenant(user.tenantId, facilityId);
  }

  @Post()
  async create(
    @Body() body: {
      coachId: string;
      courtId: string;
      slotId: string;
      title: string;
      description?: string;
      maxStudents?: number;
      price: number;
      startTime: string;
      endTime: string;
    },
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.lessons.create(body, user.tenantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; description: string; maxStudents: number; price: number }>,
    @CurrentUser() user: { tenantId?: string }
  ) {
    return this.lessons.update(id, body, user.tenantId);
  }

  @Post(':id/enroll')
  async enroll(
    @Param('id') lessonId: string,
    @CurrentUser() user: { tenantId?: string; sub?: string }
  ) {
    const uid = user.sub;
    if (!uid) throw new BadRequestException('userId required');
    return this.lessons.enroll(lessonId, uid, user.tenantId);
  }
}
