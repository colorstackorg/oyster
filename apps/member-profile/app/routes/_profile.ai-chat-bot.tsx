/*
This is the UI for the AI chatbot on the profile page of member profiles.
*/
import { useState } from 'react';

import { Button } from '@oyster/ui';

import { Card } from '@/shared/components/card';
import { ChatBar } from '@/shared/components/chat-bar';

export default function AiChatBot() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async () => {
    if (question.trim()) {
      setSubmittedQuestion(question);
      setQuestion(''); // Clear the input after submitting
      setResponse('Searching...');

      try {
        const response = await fetch(
          `/api/chat/output?text=${encodeURIComponent(question)}`
        );
        const data = await response.json();

        if (response.ok) {
          setResponse(data.answer);
        } else {
          setResponse(`Error: ${data.error}`);
        }
      } catch (error) {
        setResponse('An error occurred while fetching the response.');
      }
    }
  };

  const handleClear = () => {
    setQuestion('');
    setResponse('');
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden shadow-xl">
        <div className="bg-white p-0 text-black">
          <h1 className="mb-2 text-4xl font-bold text-[#348E87]">
            Oyster AI 🦪🤖
          </h1>
          <p className="text-base text-gray-600">
            I'm here to help with any questions you have!
          </p>
        </div>
        <div className="space-y-6 bg-white pt-0">
          <div className="h-96 overflow-auto rounded-lg border border-[#348E87] bg-white p-6">
            {response ? (
              <div className="space-y-6">
                <div className="rounded-lg bg-[#348E87] p-4 shadow">
                  <p className="text-base text-white">{submittedQuestion}</p>
                </div>
                <div className="rounded-lg border border-[#348E87] bg-white p-4 shadow">
                  <p className="text-base text-gray-800">{response}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-gray-500">
                  {
                    "Ask me anything and i'll search the ColorStack slack for you!"
                  }
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <div className="flex-grow">
              <ChatBar
                placeholder="Type your question here..."
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuestion(e.target.value)
                }
                value={question}
              />
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={handleSubmit}
                disabled={!question.trim()}
                variant="primary"
              >
                Enter
              </Button>
              <Button onClick={handleClear} variant="secondary">
                Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
