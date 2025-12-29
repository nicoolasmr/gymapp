import React from 'react';

interface BarChartProps {
    data: { date: string; count: number }[];
    height?: number;
    barColor?: string;
    hoverColor?: string;
}

export default function BarChart({
    data,
    height = 200,
    barColor = '#2563eb',
    hoverColor = '#1d4ed8'
}: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.count), 1);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="w-full">
            <div
                className="flex items-end justify-between gap-2"
                style={{ height: `${height}px` }}
            >
                {data.map((item, index) => {
                    const barHeight = (item.count / maxValue) * 100;

                    return (
                        <div
                            key={index}
                            className="flex flex-col items-center gap-2 flex-1 group"
                        >
                            {/* Tooltip */}
                            <div className="relative w-full flex justify-center">
                                <span className="absolute -top-8 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {item.count} check-ins
                                </span>

                                {/* Bar */}
                                <div
                                    className="w-full max-w-[40px] rounded-t-lg transition-all duration-300"
                                    style={{
                                        height: `${barHeight}%`,
                                        minHeight: item.count > 0 ? '4px' : '0px',
                                        backgroundColor: barColor
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = hoverColor;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = barColor;
                                    }}
                                />
                            </div>

                            {/* Date Label */}
                            <span className="text-xs text-gray-500 font-medium">
                                {formatDate(item.date)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
