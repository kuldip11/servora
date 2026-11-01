"use client";
import { track } from "@/lib/analytics";
const questions = [
  [
    "What does Servora connect?",
    "Restaurant orders, kitchen preparation, floor service and management. Staff and guests have different workspaces, with the order and restaurant context linking the work.",
  ],
  [
    "Can guests order from a QR code?",
    "The customer application uses a restaurant QR session. Guests can browse the available menu, customize items, review a cart and follow their placed order.",
  ],
  [
    "Is the playground a live restaurant?",
    "No. It is a local demonstration using sample data. Orders, guest requests and payments in the playground are not sent to a real restaurant.",
  ],
  [
    "How do we discuss pricing?",
    "Request a walkthrough with your restaurant's workflow and branch context. Commercial terms, deployment requirements and payment configuration need to be confirmed for your setup.",
  ],
];
export function Faq() {
  return (
    <section className="faq-section container">
      <h2>
        A few things
        <br />
        before we talk.
      </h2>
      <div>
        {questions.map(([question, answer]) => (
          <details
            key={question}
            onToggle={(event) => {
              if (event.currentTarget.open)
                track({ event: "faq_item_expand", question: question! });
            }}
          >
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
