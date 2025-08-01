import React from "react";
import { PromptMessage } from "@helicone-package/llm-mapper/types";
import { MessageGroup } from "./MessageGroup";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { PROMPT_MODES } from "./chatTopBar";

interface ShowMoreButtonProps {
  messagesCount: number;
  setShowAllMessages: (show: boolean) => void;
}

export const ShowMoreButton: React.FC<ShowMoreButtonProps> = ({
  messagesCount,
  setShowAllMessages,
}) => {
  return (
    <div className="relative flex flex-row items-center justify-center py-8">
      <button
        onClick={() => setShowAllMessages(true)}
        className="absolute flex flex-row items-center space-x-1 rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <ChatBubbleLeftRightIcon className="h-4 w-4" />
        <p className="text-xs font-semibold">
          Show More{" "}
          <span className="text-gray-500">({messagesCount - 4} hidden)</span>
        </p>
      </button>
    </div>
  );
};

interface PartialMessagesProps {
  messages: PromptMessage[];
  expandedChildren: { [key: string]: boolean };
  setExpandedChildren: React.Dispatch<
    React.SetStateAction<{ [key: string]: boolean }>
  >;
  selectedProperties?: Record<string, string>;
  isHeliconeTemplate?: boolean;
  autoInputs?: any[];
  setShowAllMessages: (show: boolean) => void;
  mode: (typeof PROMPT_MODES)[number];
}

export const PartialMessages: React.FC<PartialMessagesProps> = ({
  messages,
  expandedChildren,
  setExpandedChildren,
  selectedProperties,
  isHeliconeTemplate,
  autoInputs,
  setShowAllMessages,
  mode,
}) => {
  const firstTwo = messages.slice(0, 2);
  const lastTwo = messages.slice(messages.length - 2, messages.length);

  return (
    <>
      <MessageGroup
        messages={firstTwo}
        expandedChildren={expandedChildren}
        setExpandedChildren={setExpandedChildren}
        selectedProperties={selectedProperties}
        isHeliconeTemplate={isHeliconeTemplate}
        autoInputs={autoInputs}
        mode={mode}
      />
      <ShowMoreButton
        messagesCount={messages.length}
        setShowAllMessages={setShowAllMessages}
      />
      <MessageGroup
        messages={lastTwo}
        expandedChildren={expandedChildren}
        setExpandedChildren={setExpandedChildren}
        selectedProperties={selectedProperties}
        isHeliconeTemplate={isHeliconeTemplate}
        autoInputs={autoInputs}
        mode={mode}
      />
    </>
  );
};
