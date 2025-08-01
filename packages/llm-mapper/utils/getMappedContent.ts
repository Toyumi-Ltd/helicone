import { mapAnthropicRequest } from "../mappers/anthropic/chat";
import { mapGeminiPro } from "../mappers/gemini/chat";
import { mapOpenAIRequest } from "../mappers/openai/chat";
import { mapDalleRequest } from "../mappers/openai/dalle";
import { mapOpenAIEmbedding } from "../mappers/openai/embedding";
import { mapOpenAIInstructRequest } from "../mappers/openai/instruct";
import {
  HeliconeRequest,
  MappedLLMRequest,
  MapperType,
  Message,
} from "../types";

import { mapLlamaRequest } from "../mappers/llama/chat";
import { mapVercelRequest } from "../mappers/vercel/chat";
import { mapBlackForestLabsImage } from "../mappers/black-forest-labs/image";
import { mapOpenAIAssistant } from "../mappers/openai/assistant";
import { mapOpenAIModeration } from "../mappers/openai/moderation";
import { mapRealtimeRequest } from "../mappers/openai/realtime";
import { mapTool } from "../mappers/tool";
import { MapperFn } from "../mappers/types";
import { mapVectorDB } from "../mappers/vector-db";
import { getMapperTypeFromHeliconeRequest } from "./getMapperType";
import { mapOpenAIResponse } from "../mappers/openai/responses";

const MAX_PREVIEW_LENGTH = 1_000;

export const MAPPERS: Record<MapperType, MapperFn<any, any>> = {
  "openai-chat": mapOpenAIRequest,
  "openai-response": mapOpenAIResponse,
  "anthropic-chat": mapAnthropicRequest,
  "gemini-chat": mapGeminiPro,
  "llama-chat": mapLlamaRequest,
  "vercel-chat": mapVercelRequest,
  "black-forest-labs-image": mapBlackForestLabsImage,
  "openai-assistant": mapOpenAIAssistant,
  "openai-image": mapDalleRequest,
  "openai-moderation": mapOpenAIModeration,
  "openai-embedding": mapOpenAIEmbedding,
  "openai-instruct": mapOpenAIInstructRequest,
  "openai-realtime": mapRealtimeRequest,
  "vector-db": mapVectorDB,
  tool: mapTool,
  unknown: mapOpenAIRequest,
} satisfies Record<MapperType, MapperFn<any, any>>;

const getStatusType = (
  heliconeRequest: HeliconeRequest
): MappedLLMRequest["heliconeMetadata"]["status"]["statusType"] => {
  if (heliconeRequest.response_body?.error?.message) {
    return "error";
  }
  switch (heliconeRequest.response_status) {
    case 200:
      return "success";
    case 0:
    case null:
      return "pending";
    default:
      return "error";
  }
};

const metaDataFromHeliconeRequest = (
  heliconeRequest: HeliconeRequest,
  model: string
): MappedLLMRequest["heliconeMetadata"] => {
  return {
    requestId: heliconeRequest.request_id,
    countryCode: heliconeRequest.country_code,
    cacheEnabled: heliconeRequest.cache_enabled ?? false,
    cacheReferenceId: heliconeRequest.cache_reference_id ?? null,
    cost: heliconeRequest.cost ?? 0,
    createdAt: heliconeRequest.request_created_at,
    path: heliconeRequest.request_path,
    completionTokens: heliconeRequest.completion_tokens,
    promptCacheWriteTokens: heliconeRequest.prompt_cache_write_tokens,
    promptCacheReadTokens: heliconeRequest.prompt_cache_read_tokens,
    promptTokens: heliconeRequest.prompt_tokens,
    totalTokens: heliconeRequest.total_tokens,
    latency: heliconeRequest.delay_ms,
    user: heliconeRequest.request_user_id,
    customProperties: heliconeRequest.request_properties,
    status: {
      statusType: getStatusType(heliconeRequest),
      code: heliconeRequest.response_status,
    },
    feedback: {
      createdAt: heliconeRequest.feedback_created_at ?? null,
      id: heliconeRequest.feedback_id ?? null,
      rating: heliconeRequest.feedback_rating ?? null,
    },
    provider: heliconeRequest.provider,
    timeToFirstToken: heliconeRequest.time_to_first_token,
    scores: heliconeRequest.scores,
    gatewayRouterId: heliconeRequest.gateway_router_id,
    gatewayDeploymentTarget: heliconeRequest.gateway_deployment_target,
    promptId: heliconeRequest.prompt_id ?? null,
    promptVersion: heliconeRequest.prompt_version ?? null,
  };
};

const getUnsanitizedMappedContent = ({
  mapperType,
  heliconeRequest,
}: {
  mapperType: MapperType;
  heliconeRequest: HeliconeRequest;
}): MappedLLMRequest => {
  const mapper = MAPPERS[mapperType];
  if (!mapper) {
    throw new Error(`Mapper not found: ${JSON.stringify(mapperType)}`);
  }
  let result: ReturnType<MapperFn<any, any>>;
  try {
    result = mapper({
      request: heliconeRequest.request_body,
      response: heliconeRequest.response_body,
      statusCode: heliconeRequest.response_status,
      model: heliconeRequest.model,
    });
  } catch (e) {
    result = {
      preview: {
        concatenatedMessages: [],
        request: JSON.stringify(heliconeRequest.request_body),
        response: JSON.stringify(heliconeRequest.response_body),
        fullRequestText: () => {
          return JSON.stringify(heliconeRequest.request_body);
        },
        fullResponseText: () => {
          return JSON.stringify(heliconeRequest.response_body);
        },
      },
      schema: {
        request: {
          prompt: `Error: ${(e as Error).message}`,
        },
      },
    };
  }

  return {
    _type: mapperType,
    preview: result.preview,
    schema: result.schema,
    model: heliconeRequest.model,
    id: heliconeRequest.request_id,
    raw: {
      request: heliconeRequest.request_body,
      response: heliconeRequest.response_body,
    },
    heliconeMetadata: metaDataFromHeliconeRequest(
      heliconeRequest,
      heliconeRequest.model
    ),
  };
};

const messageToText = (message: Message): string => {
  let text = "";
  message.contentArray?.forEach((message) => {
    text += messageToText(message).trim();
  });
  text += message.content?.trim() ?? "";
  message.tool_calls?.forEach((toolCall) => {
    text += JSON.stringify(toolCall.arguments).trim();
    if (toolCall.name) {
      text += JSON.stringify(toolCall.name).trim();
    }
  });
  text += message.role ?? "";
  text += message.name ?? "";
  text += message.tool_call_id ?? "";
  return text.trim();
};

const messagesToText = (messages: Message[]): string => {
  return messages.map(messageToText).join("\n").trim();
};

const sanitizeMappedContent = (
  mappedContent: MappedLLMRequest
): MappedLLMRequest => {
  const sanitizeMessage = (message: Message): Message => {
    if (!message) {
      return {
        role: "unknown",
        content: "",
        _type: "message",
      };
    }
    return {
      ...message,
      content: message.content
        ? typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content)
        : "",
    };
  };

  const sanitizeMessages = (
    messages: Message[] | undefined | null
  ): Message[] | undefined | null => {
    return messages?.map(sanitizeMessage);
  };

  if (mappedContent.schema.response?.error?.heliconeMessage) {
    try {
      if (
        typeof mappedContent.schema.response.error.heliconeMessage === "string"
      ) {
        mappedContent.schema.response.error.heliconeMessage = JSON.stringify(
          JSON.parse(mappedContent.schema.response.error.heliconeMessage),
          null,
          2
        );
      } else {
        mappedContent.schema.response.error.heliconeMessage = JSON.stringify(
          mappedContent.schema.response.error.heliconeMessage,
          null,
          2
        );
      }
    } catch (e) {}
  }

  return {
    _type: mappedContent._type,
    id: mappedContent.id,
    schema: {
      request: {
        ...mappedContent.schema.request,
        messages: sanitizeMessages(mappedContent.schema.request.messages),
      },
      response: mappedContent.schema.response && {
        ...mappedContent.schema.response,
        messages: sanitizeMessages(mappedContent.schema.response.messages),
      },
    },
    preview: {
      request:
        typeof mappedContent.preview.request === "string"
          ? mappedContent.preview.request
              .replaceAll("\n", " ")
              .slice(0, MAX_PREVIEW_LENGTH)
          : String(mappedContent.preview.request || "").slice(
              0,
              MAX_PREVIEW_LENGTH
            ),
      response:
        typeof mappedContent.preview.response === "string"
          ? mappedContent.preview.response
              .replaceAll("\n", " ")
              .slice(0, MAX_PREVIEW_LENGTH)
          : String(mappedContent.preview.response || "").slice(
              0,
              MAX_PREVIEW_LENGTH
            ),
      concatenatedMessages:
        sanitizeMessages(mappedContent.preview.concatenatedMessages) ?? [],
      fullRequestText: (preview?: boolean) => {
        if (preview) {
          return mappedContent.preview.request;
        }
        return messagesToText(mappedContent.schema.request.messages ?? []);
      },
      fullResponseText: (preview?: boolean) => {
        if (preview) {
          return mappedContent.preview.response;
        }
        return messagesToText(mappedContent.schema.response?.messages ?? []);
      },
    },
    model: mappedContent.model,
    raw: mappedContent.raw,
    heliconeMetadata: mappedContent.heliconeMetadata,
  };
};

export const getMappedContent = ({
  mapperType,
  heliconeRequest,
}: {
  mapperType: MapperType;
  heliconeRequest: HeliconeRequest;
}): MappedLLMRequest => {
  const unsanitized = getUnsanitizedMappedContent({
    mapperType,
    heliconeRequest,
  });

  return sanitizeMappedContent(unsanitized);
};

export const heliconeRequestToMappedContent = (
  heliconeRequest: HeliconeRequest
): MappedLLMRequest => {
  const mapperType = getMapperTypeFromHeliconeRequest(
    heliconeRequest,
    heliconeRequest.model
  );
  return getMappedContent({
    mapperType,
    heliconeRequest,
  });
};
