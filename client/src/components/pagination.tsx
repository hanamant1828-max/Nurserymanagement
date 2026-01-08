import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords: number;
  pageSize: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getVisiblePages = () => {
    const delta = 1;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift("...");
    }
    if (currentPage + delta < totalPages - 1) {
      range.push("...");
    }

    range.unshift(1);
    if (totalPages !== 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-4 px-4 border rounded-xl bg-card shadow-sm mt-6">
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        Showing <br />
        <span className="font-medium text-foreground">{startRecord} to {endRecord}</span> <br />
        of <span className="font-medium text-foreground">{totalRecords}</span> results
      </div>
      <div className="flex items-center space-x-1.5 ml-auto">
        <Button
          variant="outline"
          className="h-9 px-3 gap-1 hidden sm:flex border-border/50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          data-testid="button-pagination-prev"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:hidden border-border/50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1.5">
          {getVisiblePages().map((page, index) => (
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={`page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={`h-9 min-w-[36px] font-bold rounded-md ${
                  currentPage === page 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary" 
                    : "border-border/50 hover:bg-muted"
                }`}
                onClick={() => onPageChange(page as number)}
                data-testid={`button-pagination-page-${page}`}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        <Button
          variant="outline"
          className="h-9 px-3 gap-1 hidden sm:flex border-border/50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          data-testid="button-pagination-next"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:hidden border-border/50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
