import { Module } from '@nestjs/common';
import { BookingWidgetService } from './booking-widget.service';
import { BookingWidgetResolver } from './booking-widget.resolver';

@Module({
  providers: [BookingWidgetService, BookingWidgetResolver],
  exports: [BookingWidgetService],
})
export class BookingWidgetModule {}
