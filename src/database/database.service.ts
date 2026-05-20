import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;
  public db: NodePgDatabase<Record<string, never>>;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.getOrThrow<string>('DATABASE_URL'),
    });
    this.db = drizzle(this.pool);
  }

  async onModuleInit() {
    this.logger.log('Intentando conectar a la base de datos PostgreSQL...');
    try {
      // Realizamos una consulta simple para comprobar la conexión activa
      await this.pool.query('SELECT 1');
      this.logger.log(
        'Conexión a la base de datos PostgreSQL establecida con éxito.',
      );
    } catch (error) {
      this.logger.error(
        'Error al conectar a la base de datos PostgreSQL:',
        error,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Cerrando la conexión de la base de datos PostgreSQL...');
    try {
      await this.pool.end();
      this.logger.log(
        'Conexión a la base de datos PostgreSQL cerrada con éxito.',
      );
    } catch (error) {
      this.logger.error(
        'Error al cerrar la conexión a la base de datos PostgreSQL:',
        error,
      );
    }
  }
}
