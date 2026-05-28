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

    // Run parallel aggregations for performance
    const [
      totalCount,
      statusGroup,
      sourceGroup,
      workModeGroup,
      monthlyGroup,
    ] = await Promise.all([
      Application.countDocuments({ userId }),

      // Status breakdown
      Application.aggregate([
        { $match: { userId } },
        { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
      ]),

      // Source breakdown
      Application.aggregate([
        { $match: { userId } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),

      // Work Mode breakdown
      Application.aggregate([
        { $match: { userId } },
        { $group: { _id: "$workMode", count: { $sum: 1 } } },
      ]),

      // Monthly breakdown (last 6 months)
      Application.aggregate([
        {
          $match: {
            userId,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
            },
          },
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
