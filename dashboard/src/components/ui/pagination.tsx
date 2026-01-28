import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation("common");

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
      >
        {t("pagination.previous")}
      </Button>
      <span className="text-sm text-muted-foreground px-2">
        {t("pagination.pageOf", { page, totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );
}
