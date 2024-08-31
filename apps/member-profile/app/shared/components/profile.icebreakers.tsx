import React, { type PropsWithChildren, useContext, useState } from 'react';

import { type IcebreakerResponse } from '@oyster/core/member-profile/ui';

// Types

export type PromptNumber = '1' | '2' | '3';

// Context

type PromptIds = Record<PromptNumber, string | null>;

const initialPromptIds: PromptIds = {
  '1': null,
  '2': null,
  '3': null,
};

const IcebreakerContext = React.createContext({
  promptIds: initialPromptIds,
  setPromptId(_number: PromptNumber, _promptId: string) {},
});

// Hook

export function useIcebreakerContext() {
  return useContext(IcebreakerContext);
}

// Provider

type IcebreakersProviderProps = PropsWithChildren<{
  icebreakerResponses: readonly Pick<IcebreakerResponse, 'promptId' | 'text'>[];
}>;

export function IcebreakersProvider({
  children,
  icebreakerResponses,
}: IcebreakersProviderProps) {
  icebreakerResponses.forEach((response, i) => {
    const number = String(i + 1) as PromptNumber;

    initialPromptIds[number] = response.promptId;
  });

  const [promptIds, setPromptIds] = useState<PromptIds>(initialPromptIds);

  function setPromptId(number: PromptNumber, promptId: string) {
    setPromptIds((promptIds) => {
      return {
        ...promptIds,
        [number]: promptId,
      };
    });
  }

  return (
    <IcebreakerContext.Provider
      value={{
        promptIds,
        setPromptId,
      }}
    >
      {children}
    </IcebreakerContext.Provider>
  );
}
