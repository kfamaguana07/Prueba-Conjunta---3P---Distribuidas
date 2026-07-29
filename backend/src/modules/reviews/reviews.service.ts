import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../common/event-publisher.service';
import { CreateReviewDto } from './dto/create-review.dto';

const round1 = (n: number | null) => (n != null ? Math.round(n * 10) / 10 : null);

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisher,
  ) {}

  async createOrUpdate(userId: string, dto: CreateReviewDto) {
    const existing = await this.prisma.review.findFirst({
      where: { userId, wineId: dto.wineId, targetType: 'WINE' },
    });
    const reviewData = { rating: dto.rating, comment: dto.comment ?? null };
    const isUpdate = !!existing;
    const review = isUpdate
      ? await this.prisma.review.update({ where: { id: existing.id }, data: reviewData })
      : await this.prisma.review.create({
          data: { userId, targetType: 'WINE', wineId: dto.wineId, ...reviewData },
        });
    const agg = await this.prisma.review.aggregate({
      where: { wineId: dto.wineId, targetType: 'WINE' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.publisher.publish({
      entity: 'REVIEW',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      userId,
      data: { reviewId: review.id, wineId: dto.wineId, rating: dto.rating },
    });
    return { review, avgRating: round1(agg._avg.rating), reviewCount: agg._count._all };
  }

  async listForWine(wineId: string, page = 1, pageSize = 10) {
    const take = Math.min(50, Math.max(1, pageSize));
    const skip = (Math.max(1, page) - 1) * take;
    const [items, total, agg] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { wineId, targetType: 'WINE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.review.count({ where: { wineId, targetType: 'WINE' } }),
      this.prisma.review.aggregate({ where: { wineId, targetType: 'WINE' }, _avg: { rating: true } }),
    ]);
    return {
      items: items.map((r: any) => ({
        id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.user.name,
      })),
      total,
      avgRating: round1(agg._avg.rating),
      reviewCount: total,
    };
  }
}
