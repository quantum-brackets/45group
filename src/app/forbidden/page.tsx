
import { ForbiddenPage } from '@/components/common/ForbiddenPage';

interface ForbiddenProps {
    searchParams: {
        error?: string;
        message?: string;
    }
}

export default function Forbidden({ searchParams }: ForbiddenProps) {
    return (
        <ForbiddenPage 
            title={searchParams.error || 'Access Denied'}
            message={searchParams.message || 'You do not have permission to access this page.'}
        />
    )
}
