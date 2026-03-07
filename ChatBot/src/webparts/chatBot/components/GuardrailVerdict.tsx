import * as React from "react";
import { GuardrailModel } from "../service/model";
import styles from "./ChatBot.module.scss";

interface GuardrailVerdictProps {
  guardrail: GuardrailModel;
}

export const GuardrailVerdict: React.FC<GuardrailVerdictProps> = ({ guardrail }) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [placement, setPlacement] = React.useState<"up" | "down">("up");

  const openFlap = (event?: React.SyntheticEvent<HTMLElement>): void => {
    if (event) {
      const chipRect = event.currentTarget.getBoundingClientRect();
      const estimatedFlapHeight = 180;
      const availableAbove = chipRect.top;
      const availableBelow = window.innerHeight - chipRect.bottom;

      if (availableAbove < estimatedFlapHeight && availableBelow >= estimatedFlapHeight) {
        setPlacement("down");
      }
      else {
        setPlacement("up");
      }
    }
    setIsOpen(true);
  };

  const closeFlap = (): void => {
    setIsOpen(false);
  };

  return (
    <div className={styles.guardrailMeta}>
      <span
        className={`${styles.verdictBadge} ${guardrail.verdict === "grounded" ? styles.verdictGrounded : guardrail.verdict === "partially_grounded" ? styles.verdictPartial : styles.verdictNotGrounded}`}
        role="button"
        tabIndex={0}
        onMouseEnter={(e) => openFlap(e)}
        onMouseLeave={closeFlap}
        onFocus={(e) => openFlap(e)}
        onBlur={closeFlap}
        onClick={(e) => {
          if (isOpen) {
            setIsOpen(false);
          }
          else {
            openFlap(e);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        Verdict: {guardrail.verdict}
      </span>
      <span className={styles.confidenceChip}>
        Confidence: {guardrail.confidence}
      </span>
      {isOpen && (
        <div
          className={`${styles.guardrailFlap} ${placement === "down" ? styles.guardrailFlapDown : styles.guardrailFlapUp}`}
          onMouseEnter={(e) => openFlap(e)}
          onMouseLeave={closeFlap}
        >
          {Array.isArray(guardrail.issues) && guardrail.issues.length > 0 ? (
            <ul className={styles.guardrailIssueList}>
              {guardrail.issues.map((issue, issueIndex) => {
                const issueObj = issue as { claim?: string; missing_info?: string };
                return (
                  <li key={issueIndex} className={styles.guardrailIssueItem}>
                    {issueObj.claim || "Unsupported claim"}
                    {issueObj.missing_info ? ` - ${issueObj.missing_info}` : ""}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.guardrailIssueItem}>
              All claims are supported by retrieved context.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
