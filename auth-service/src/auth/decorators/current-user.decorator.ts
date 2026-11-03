import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    // Check if GraphQL context
    const gqlContext = GqlExecutionContext.create(context);
    const gqlReq = gqlContext.getContext()?.req;
    if (gqlReq && gqlReq.user) {
      return gqlReq.user;
    }

    // Fallback to standard HTTP Request
    const httpReq = context.switchToHttp().getRequest();
    return httpReq?.user;
  },
);
