import { prisma } from "@/server/db";
import { notFound } from "next/navigation";
import { Thread } from "@/components/forum/Thread";
import { PostType, Prisma } from "@prisma/client";

export default async function ForumThreadPage({ params }: { params: { id: string } }) {
  const question = await prisma.post.findUnique({
    where: { 
      id: params.id,
      type: PostType.QUESTION,
      deletedAt: null 
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        }
      },
      tags: {
        include: {
          tag: true
        }
      },
      votes: true,
      _count: {
        select: { replies: true }
      }
    }
  });

  if (!question) {
    notFound();
  }

  const answers = await prisma.post.findMany({
    where: {
      parentId: question.id,
      type: PostType.ANSWER,
      deletedAt: null
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        }
      },
      votes: true
    },
    orderBy: [
      { accepted: "desc" },
      { createdAt: "asc" }
    ]
  });

  return (
    <div className="container max-w-5xl py-12 mx-auto px-4">
      <Thread question={question as unknown as Prisma.PostGetPayload<{ include: { author: true, tags: { include: { tag: true } }, votes: true, _count: { select: { replies: true } } } }>} answers={answers as unknown as Prisma.PostGetPayload<{ include: { author: true, votes: true } }>[]} />
    </div>
  );
}
