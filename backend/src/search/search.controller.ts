import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchQuery } from './dto/search.query.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQuery) {
    return this.searchService.search(query.q);
  }
}
