import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { VideosService } from './videos.service.js';
import { VIDEO_VIEWS_QUEUE } from './queue-names.js';

interface ViewJobData {
  videoId: string;
}

// Moves view-count writes off the request path. A view on a popular video
// is a very hot write (one UPDATE per viewer, every viewer); queuing it
// means a burst of traffic can't turn into a burst of synchronous DB writes
// blocking the response.
@Processor(VIDEO_VIEWS_QUEUE)
export class ViewsProcessor extends WorkerHost {
  constructor(private readonly videosService: VideosService) {
    super();
  }

  async process(job: Job<ViewJobData>): Promise<void> {
    await this.videosService.incrementViewCount(job.data.videoId);
  }
}
