import { Link } from "react-router-dom";

export default function NoPeriod() {
    return (
        <div className="rounded-lg border bg-background p-4 mt-4">
            <h1 className='text-sm font-medium'>No Pay Periods Found</h1>
            <div className='text-xs text-muted-foreground mt-1'>
                To get started, go to the
                <Link to="/settings" className='text-blue-600 hover:underline ml-1'>
                    Settings {" "}
                </Link>
                page and create a new pay period.
            </div>
        </div>
    )
}