import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    const accessKeyId = this.configService.get<string>(
      'AWS_ACCESS_KEY_ID',
      'test',
    );
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      'test',
    );

    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET');

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: true, // Requerido para LocalStack/Floci
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async onModuleInit() {
    await this.createBucketIfNotExists();
  }

  /**
   * Crea el bucket de S3 si no existe en el entorno local/producción.
   */
  private async createBucketIfNotExists(): Promise<void> {
    try {
      this.logger.log(
        `Verificando existencia del bucket de S3: ${this.bucketName}...`,
      );
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`El bucket "${this.bucketName}" ya existe.`);
    } catch (error: unknown) {
      const s3Error = error as Error & {
        $metadata?: { httpStatusCode?: number };
      };
      // Si el error es un 404 (NotFound), creamos el bucket
      if (
        s3Error.$metadata?.httpStatusCode === 404 ||
        s3Error.name === 'NotFound'
      ) {
        this.logger.log(
          `El bucket "${this.bucketName}" no existe. Creándolo...`,
        );
        try {
          await this.s3Client.send(
            new CreateBucketCommand({ Bucket: this.bucketName }),
          );
          this.logger.log(`Bucket "${this.bucketName}" creado con éxito.`);
        } catch (createError) {
          this.logger.error(
            `Error al crear el bucket "${this.bucketName}":`,
            createError,
          );
        }
      } else {
        this.logger.error(
          `Error inesperado al verificar el bucket "${this.bucketName}":`,
          error,
        );
      }
    }
  }

  /**
   * Sube un archivo a S3.
   */
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    this.logger.log(`Subiendo archivo a S3 con Key: ${key}...`);
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      this.logger.log(`Archivo subido exitosamente a S3.`);

      // Retorna la URL pública aproximada del recurso
      const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
      if (endpoint) {
        return `${endpoint}/${this.bucketName}/${key}`;
      }
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(
        `Error al subir el archivo con Key "${key}" a S3:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtiene un archivo de S3.
   */
  async getFile(key: string): Promise<unknown> {
    this.logger.log(`Obteniendo archivo de S3 con Key: ${key}...`);
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return response.Body;
    } catch (error) {
      this.logger.error(
        `Error al obtener el archivo con Key "${key}" de S3:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Elimina un archivo de S3.
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Eliminando archivo de S3 con Key: ${key}...`);
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`Archivo con Key "${key}" eliminado con éxito de S3.`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar el archivo con Key "${key}" de S3:`,
        error,
      );
      throw error;
    }
  }
}
