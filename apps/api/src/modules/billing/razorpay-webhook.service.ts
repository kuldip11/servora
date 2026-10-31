import { razorpayWebhookIngestService } from "./razorpay-webhook-ingest.service";
import { razorpayWebhookProcessorService } from "./razorpay-webhook-processor.service";

export const razorpayWebhookService = {
  ...razorpayWebhookIngestService,
  ...razorpayWebhookProcessorService,
};
