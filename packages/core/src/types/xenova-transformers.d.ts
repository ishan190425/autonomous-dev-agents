/**
 * Type declarations for @xenova/transformers
 *
 * This is an optional peer dependency for LocalEmbeddingProvider.
 * Full types are available when the package is installed.
 *
 * @see https://huggingface.co/docs/transformers.js
 */

declare module '@xenova/transformers' {
  export interface PipelineOptions {
    quantized?: boolean;
  }

  export interface FeatureExtractionOutput {
    data: Float32Array;
  }

  export interface FeatureExtractionPipeline {
    (
      text: string,
      options?: {
        pooling?: 'mean' | 'cls' | 'max';
        normalize?: boolean;
      }
    ): Promise<FeatureExtractionOutput>;
  }

  export function pipeline(
    task: 'feature-extraction',
    model: string,
    options?: PipelineOptions
  ): Promise<FeatureExtractionPipeline>;
}
