import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext()?.req;
    if (req && req.user) {
      return req.user;
    }
    const httpReq = context.switchToHttp().getRequest();
    return httpReq?.user;
  },
);
