import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongoose";
import Application from "@/models/Application";
import { requireAuth } from "@/lib/auth/session";
import { successResponse, handleApiError } from "@/lib/api/response";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    await dbConnect();

    const userId = new mongoose.Types.ObjectId(session.id);
    const now = new Date();
    const match: Record<string, any> = { userId };

    const period = new URL(request.url).searchParams.get("period") || "this_month";
    let dateGte: Date | null = null;
    let dateLte: Date | null = null;

    if (period === "ytd") {
      dateGte = new Date(now.getFullYear(), 0, 1);
    } else if (period === "this_month") {
      dateGte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "last_month") {
      dateGte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      dateLte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === "last_year") {
      dateGte = new Date(now.getFullYear() - 1, 0, 1);
      dateLte = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (period === "this_quarter") {
      const startMonth = Math.floor(now.getMonth() / 3) * 3;
      dateGte = new Date(now.getFullYear(), startMonth, 1);
    } else if (period === "last_quarter") {
      const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
      dateGte = new Date(now.getFullYear(), currentQuarterStart - 3, 1);
      dateLte = new Date(now.getFullYear(), currentQuarterStart, 0, 23, 59, 59, 999);
    }

    if (dateGte || dateLte) {
      const dateQuery: Record<string, any> = {};
      if (dateGte) dateQuery.$gte = dateGte;
      if (dateLte) dateQuery.$lte = dateLte;
      match.createdAt = dateQuery;
    }

    const trendMatch: Record<string, any> = { userId };
    if (match.createdAt) {
      trendMatch.createdAt = match.createdAt;
    } else {
      trendMatch.createdAt = {
        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      };
    }

    // Run parallel aggregations for performance
    const [
      totalCount,
      statusGroup,
      sourceGroup,
      workModeGroup,
      monthlyGroup,
    ] = await Promise.all([
      Application.countDocuments(match),

      // Status breakdown
      Application.aggregate([
        { $match: match },
        { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
      ]),

      // Source breakdown
      Application.aggregate([
        { $match: match },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),

      // Work Mode breakdown
      Application.aggregate([
        { $match: match },
        { $group: { _id: "$workMode", count: { $sum: 1 } } },
      ]),

      // Monthly breakdown
      Application.aggregate([
        {
          $match: trendMatch,
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Format results nicely
    const statusMap: Record<string, number> = {};
    let interviewCount = 0;
    let offerCount = 0;
    let rejectionCount = 0;

    statusGroup.forEach((item) => {
      const status = item._id || "Saved";
      statusMap[status] = item.count;

      if (
        [
          "Interview scheduled",
          "Interview completed",
          "Final round",
        ].includes(status)
      ) {
        interviewCount += item.count;
      }
      if (["Offer received", "Offer accepted"].includes(status)) {
        offerCount += item.count;
      }
      if (status === "Rejected") {
        rejectionCount += item.count;
      }
    });

    const sources = sourceGroup.map((item) => ({
      name: item._id || "Other",
      count: item.count,
    }));

    const workModes = workModeGroup.map((item) => ({
      name: item._id || "Unspecified",
      count: item.count,
    }));

    const monthlyTrends = monthlyGroup.map((item) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return {
        label: `${months[item._id.month - 1]} ${item._id.year}`,
        count: item.count,
      };
    });

    return successResponse({
      totalCount,
      interviewCount,
      offerCount,
      rejectionCount,
      statusBreakdown: statusMap,
      sources,
      workModes,
      monthlyTrends,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
