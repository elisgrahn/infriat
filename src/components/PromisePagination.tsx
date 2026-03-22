import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PromisePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PromisePagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PromisePaginationProps) => {
  if (totalPages <= 1) return null;

  const pageHref = (page: number) => `?page=${page}`;

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={pageHref(Math.max(1, currentPage - 1))}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(Math.max(1, currentPage - 1));
            }}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>

        {currentPage > 2 && (
          <PaginationItem>
            <PaginationLink
              href={pageHref(1)}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(1);
              }}
              className="cursor-pointer"
            >
              1
            </PaginationLink>
          </PaginationItem>
        )}

        {currentPage > 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {currentPage > 1 && (
          <PaginationItem>
            <PaginationLink
              href={pageHref(currentPage - 1)}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage - 1);
              }}
              className="cursor-pointer"
            >
              {currentPage - 1}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationLink isActive href={pageHref(currentPage)} className="cursor-pointer">
            {currentPage}
          </PaginationLink>
        </PaginationItem>

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationLink
              href={pageHref(currentPage + 1)}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(currentPage + 1);
              }}
              className="cursor-pointer"
            >
              {currentPage + 1}
            </PaginationLink>
          </PaginationItem>
        )}

        {currentPage < totalPages - 2 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {currentPage < totalPages - 1 && (
          <PaginationItem>
            <PaginationLink
              href={pageHref(totalPages)}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(totalPages);
              }}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            href={pageHref(Math.min(totalPages, currentPage + 1))}
            onClick={(e) => {
              e.preventDefault();
              onPageChange(Math.min(totalPages, currentPage + 1));
            }}
            className={
              currentPage === totalPages
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
