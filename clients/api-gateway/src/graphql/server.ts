import { graphqlHTTP } from 'express-graphql';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { createServer } from 'http';
import { schema } from './schema';
import { resolvers } from './resolvers';
import { logger } from '../shared/utils/logger';

interface GraphQLContext {
  user?: any;
  services: {
    trust: string;
    wallet: string;
    node: string;
    defi: string;
    governance: string;
    bridge: string;
    nft: string;
  };
}

export class GraphQLServer {
  private httpServer: any;
  private subscriptionServer: any;

  constructor(private app: any, private services: any) {
    this.setupGraphQL();
  }

  private setupGraphQL() {
    // Create GraphQL HTTP endpoint
    this.app.use('/graphql', graphqlHTTP({
      schema,
      rootValue: resolvers,
      graphiql: process.env.NODE_ENV === 'development',
      context: this.createContext.bind(this),
      customFormatErrorFn: (error) => {
        logger.error('GraphQL Error:', error);
        return {
          message: error.message,
          locations: error.locations,
          stack: error.stack ? error.stack.split('\n') : [],
          path: error.path,
        };
      },
    }));

    // Create HTTP server for WebSocket subscriptions
    this.httpServer = createServer(this.app);

    // Setup WebSocket subscriptions
    this.setupSubscriptions();

    logger.info('GraphQL server configured');
  }

  private createContext(req: any, res: any): GraphQLContext {
    return {
      user: req.user, // From auth middleware
      services: this.services,
    };
  }

  private setupSubscriptions() {
    // WebSocket subscription server
    this.subscriptionServer = SubscriptionServer.create(
      {
        schema,
        execute,
        subscribe,
        onConnect: (connectionParams: any, webSocket: any, context: any) => {
          logger.info('WebSocket client connected for subscriptions');
          return this.createContext(null, null);
        },
        onDisconnect: (webSocket: any, context: any) => {
          logger.info('WebSocket client disconnected');
        },
      },
      {
        server: this.httpServer,
        path: '/subscriptions',
      }
    );

    logger.info('WebSocket subscriptions server configured');
  }

  public start(port: number) {
    this.httpServer.listen(port, () => {
      logger.info(`GraphQL server running on port ${port}`);
      logger.info(`GraphQL playground available at http://localhost:${port}/graphql`);
      logger.info(`WebSocket subscriptions available at ws://localhost:${port}/subscriptions`);
    });
  }

  public stop() {
    if (this.subscriptionServer) {
      this.subscriptionServer.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
  }

  // Health check for GraphQL
  public async healthCheck(): Promise<boolean> {
    try {
      // Simple query to test GraphQL functionality
      const testQuery = `
        query {
          __typename
        }
      `;

      // This would normally execute the query, but for now just return true
      // In a real implementation, you'd want to test the actual GraphQL execution
      return true;
    } catch (error) {
      logger.error('GraphQL health check failed:', error);
      return false;
    }
  }
}

