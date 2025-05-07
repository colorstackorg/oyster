import { Link, useSearchParams } from '@remix-run/react';
import { type ReactElement, useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import {
  BookOpen,
  Briefcase,
  Calendar,
  DollarSign,
  FileText,
  Layers,
  MessageCircle,
  User,
  Users,
} from 'react-feather';

import { Modal, Text, useWindowSize } from '@oyster/ui';

import { EmptyState } from '@/shared/components/empty-state';
import { Route } from '@/shared/constants';

export function MemberProfileTour() {
  const [searchParams] = useSearchParams();

  if (!searchParams.has('new')) {
    return null;
  }

  return (
    <>
      <ConfettiEffect />
      <FirstTimeModal />
    </>
  );
}

function ConfettiEffect() {
  const { height, width } = useWindowSize();

  return (
    <Confetti
      gravity={0.25}
      height={height}
      numberOfPieces={1000}
      recycle={false}
      tweenDuration={3500}
      width={width}
    />
  );
}

function FirstTimeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // We want the modal to be visible while the confetti is still dropping
      // which adds a nice effect.
      setOpen(true);
    }, 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!open) {
    return null;
  }

  return (
    <Modal onCloseTo={Route['/home']}>
      <Modal.Header>
        <Modal.Title>Welcome to the Member Profile! 🎉</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Here's a quick breakdown of the important sections of the Member
        Profile:
      </Modal.Description>

      <ul className="grid grid-cols-2 gap-2">
        <FirstTimeListItem
          description="An list of all the members in the community. Joining is optional, but please join!"
          icon={<Users />}
          label="Member Directory"
          to={Route['/directory']}
        />
        <FirstTimeListItem
          description="A list of opportunities that ColorStack members have posted in our Slack workspace."
          icon={<Layers />}
          label="Opportunities"
          to={Route['/opportunities']}
        />
        <FirstTimeListItem
          description="An offer database based on real internship/full-time offers from ColorStack members."
          icon={<DollarSign />}
          label="Offers"
          to={Route['/offers']}
        />
        <FirstTimeListItem
          description="Discover where ColorStack members are interning/working for and see first-hand reviews of their experiences."
          icon={<Briefcase />}
          label="Companies"
          to={Route['/companies']}
        />
        <FirstTimeListItem
          description="A collection of resources that ColorStack members have compiled over the years."
          icon={<BookOpen />}
          label="Resources"
          to={Route['/resources']}
        />
        <FirstTimeListItem
          description="A place to request help from your peers for mock interviews, resume reviews, and more."
          icon={<Users />}
          label="Peer Help"
          to={Route['/peer-help']}
        />
        <FirstTimeListItem
          description="A list of upcoming (and past) virtual ColorStack events."
          icon={<Calendar />}
          label="Events"
          to={Route['/events']}
        />
        <FirstTimeListItem
          description="Get answers to your questions based on our 500k+ Slack messages."
          icon={<MessageCircle />}
          label="Ask AI"
          to={Route['/ask-ai']}
        />
        <FirstTimeListItem
          description="Get feedback on your resume's bullet points from AI."
          icon={<FileText />}
          label="AI Resume Review"
          to={Route['/resume/review']}
        />

        <FirstTimeListItem
          description="Keep all your information up to date."
          icon={<User />}
          label="Profile"
          to={Route['/profile']}
        />
      </ul>
    </Modal>
  );
}

type FirstTimeListItemProps = {
  description: string;
  icon: ReactElement;
  label: string;
  to: Route;
};

function FirstTimeListItem({
  description,
  icon,
  label,
  to,
}: FirstTimeListItemProps) {
  return (
    <li className="flex flex-col items-center gap-2 rounded-lg bg-gray-50/50 p-2">
      <EmptyState icon={icon} size={36} />
      <Link className="link" target="_blank" to={to}>
        {label}
      </Link>
      <Text align="center" color="gray-500" variant="sm">
        {description}
      </Text>
    </li>
  );
}
