type MemberAssignee = {
  id: string;
  name: string;
  colorKey: string;
};

type MemberAssigneesProps = {
  members: MemberAssignee[];
  variant?: 'inline' | 'chips';
  maxVisible?: number;
};

export function MemberAssignees({ members, variant = 'inline', maxVisible = 4 }: MemberAssigneesProps) {
  if (members.length === 0) return null;

  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);
  const label = `担当 ${members.map((member) => member.name).join('、')}`;

  if (variant === 'chips') {
    return (
      <div className="member-assignees member-assignees--chips" aria-label={label}>
        {visibleMembers.map((member) => (
          <span className={`member-assignee-chip is-color-${member.colorKey}`} key={member.id}>
            <i aria-hidden="true" />
            <span>{member.name}</span>
          </span>
        ))}
        {remainingCount > 0 ? <span className="member-assignee-more">他{remainingCount}名</span> : null}
      </div>
    );
  }

  return (
    <span className="member-assignees member-assignees--inline" aria-label={label}>
      {visibleMembers.map((member) => (
        <span className="member-assignee-row" key={member.id}>
          <i className={`member-assignee-dot is-color-${member.colorKey}`} aria-hidden="true" />
          <span className="member-assignee-row-name">{member.name}</span>
        </span>
      ))}
      {remainingCount > 0 ? <span className="member-assignee-more">＋{remainingCount}名</span> : null}
    </span>
  );
}
